from pathlib import Path
from typing import Dict
from jinja2 import Environment, FileSystemLoader, select_autoescape
from ..models.uml import UMLModel, UMLClass
from ..utils.zip import ZipWriter

TEMPLATE_DIR = Path(__file__).resolve().parents[3] / 'mde' / 'acceleo'

env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(['mtl'])
)

LANGUAGE_CONFIG = {
    'java': {
        'template': 'java/JavaClass.mtl',
        'extension': 'java'
    },
    'python': {
        'template': 'python/PythonClass.mtl',
        'extension': 'py'
    }
}


def _render_template(path: str, context: dict) -> str:
    try:
        template = env.get_template(path)
        return template.render(context)
    except Exception:
        # fallback to simple generation if Jinja parsing is not available
        return _generate_direct(context['classes'], context['language'])


def _generate_direct(classes: list[UMLClass], language: str) -> str:
    if language == 'java':
        entries = []
        for cls in classes:
            extends = ''
            for relation in cls.get('relations', []):
                if relation['type'] == 'inheritance' and relation['source'] == cls['id']:
                    extends = f" extends {relation['target']}"
            lines = [f"public class {cls['name']}{extends} {{"]
            for attr in cls['attributes']:
                lines.append(f"    private {attr['type']} {attr['name']};")
            lines.append('')
            lines.append(f"    public {cls['name']}() {{ }}")
            lines.append('}')
            entries.append('\n'.join(lines))
        return '\n\n'.join(entries)
    return '# Generated code'


def _class_to_context(cls: UMLClass) -> dict:
    return {
        'id': cls.id,
        'name': cls.name,
        'visibility': cls.visibility,
        'isAbstract': cls.isAbstract,
        'attributes': [attr.model_dump() for attr in cls.attributes],
        'methods': [method.model_dump() for method in cls.methods]
    }


def generate_code(model: UMLModel, language: str) -> bytes:
    config = LANGUAGE_CONFIG[language]
    files: Dict[str, str] = {}
    context = {
        'classes': [_class_to_context(cls) for cls in model.classes],
        'relations': [relation.model_dump() for relation in model.relations],
        'language': language
    }
    for cls in model.classes:
        class_context = {
            'class': _class_to_context(cls),
            'relations': [relation.model_dump() for relation in model.relations],
            'language': language
        }
        source = _render_template(config['template'], class_context)
        files[f'{cls.name}.{config["extension"]}'] = source
    return ZipWriter.create_zip(files)


def generate_all(model: UMLModel) -> bytes:
    files = {}
    for language in LANGUAGE_CONFIG:
        files[f'{language}.zip'] = generate_code(model, language)
    return ZipWriter.create_zip(files)
