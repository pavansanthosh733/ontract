from app.models.workorder_type import WorkOrderTypeModel

def create_workorder_type(data):
    return WorkOrderTypeModel.create(data)

def get_all_workorder_types():
    return WorkOrderTypeModel.get_all()

def get_workorder_type(id):
    return WorkOrderTypeModel.get_by_id(id)

def update_workorder_type(id, data):
    return WorkOrderTypeModel.update(id, data)

def delete_workorder_type(id):
    return WorkOrderTypeModel.delete(id)
