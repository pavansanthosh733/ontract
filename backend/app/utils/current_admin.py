current_admin = None

def set_admin(admin_data):
    global current_admin
    current_admin = admin_data

def get_admin():
    return current_admin