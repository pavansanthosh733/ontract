import os
import uuid
from werkzeug.utils import secure_filename
from app.config import Config

def save_uploaded_file(file, subfolder="", db_prefix=None):
    if not file or not file.filename:
        return None

    original_name = secure_filename(file.filename)

    # safer unique filename
    ext = original_name.rsplit(".", 1)[1].lower() if "." in original_name else ""
    unique_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex

    folder = os.path.join(Config.UPLOAD_FOLDER, subfolder)
    os.makedirs(folder, exist_ok=True)

    filepath = os.path.join(folder, unique_name)
    file.save(filepath)

    # OLD behavior: return only physical path
    if db_prefix is None:
        return filepath

    # NEW behavior: return both physical and db path
    return {
        "physical_path": filepath,
        "db_path": f"{db_prefix}/{unique_name}",
        "original_name": original_name
    }