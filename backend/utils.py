import secrets
import string

SHORT_CODE_CHARS = string.ascii_letters + string.digits


def generate_short_code(length: int = 7) -> str:
    return ''.join(secrets.choice(SHORT_CODE_CHARS) for _ in range(length))
