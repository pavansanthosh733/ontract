# backend/app/controllers/master_controller.py

from app.models.master_model import MasterModel

class MasterController:

    # CATEGORY → call MODEL raw SQL functions

    @staticmethod
    def get_all_categories():
        return MasterModel.get_all_categories()

    @staticmethod
    def add_category(data):
        return MasterModel.add_category(data)

    @staticmethod
    def update_category(cat_id, data):
        return MasterModel.update_category(cat_id, data)

    @staticmethod
    def delete_category(cat_id):
        return MasterModel.delete_category(cat_id)
    
    
    



    # ================= ITEM MASTER =================

    @staticmethod
    def get_all_items():
        return MasterModel.get_all_items()

    @staticmethod
    def add_item(data):
        return MasterModel.add_item(data)

    @staticmethod
    def update_item(item_id, data):
        return MasterModel.update_item(item_id, data)

    @staticmethod
    def delete_item(item_id):
        return MasterModel.delete_item(item_id)

    
    
        # TYPE → call MODEL functions

    @staticmethod
    def get_all_types():
        return MasterModel.get_all_types()

    @staticmethod
    def add_type(data):
        return MasterModel.add_type(data)

    @staticmethod
    def update_type(type_id, data):
        return MasterModel.update_type(type_id, data)

    @staticmethod
    def delete_type(type_id):
        return MasterModel.delete_type(type_id)

    

    @staticmethod
    def fetch_item_by_category_id(category_id):
        return MasterModel.fetch_item_by_category_id(category_id)

    @staticmethod
    def fetch_types(category_id, item_id):
        return MasterModel.fetch_types_by_category_item(category_id, item_id)


    
        # ================= DESCRIPTION MASTER =================

    @staticmethod
    def get_all_descriptions():
        return MasterModel.get_all_descriptions()

    @staticmethod
    def add_description(data):
        return MasterModel.add_description(data)

    @staticmethod
    def update_description(desc_id, data):
        return MasterModel.update_description(desc_id, data)

    @staticmethod
    def delete_description(desc_id):
        return MasterModel.delete_description(desc_id)


    @staticmethod
    def fetch_descriptions(category_id, item_id, type_id):
        return MasterModel.fetch_descriptions(category_id, item_id, type_id)

