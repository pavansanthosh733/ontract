from flask import Flask, send_from_directory, abort
from flask_cors import CORS
from .models.database import db
from app.config import Config
import os
import logging
from logging.handlers import RotatingFileHandler
from app.utils.auth import register_auth_middleware
from app.middleware.security_headers import register_security_headers


# ---------------------------------------------------------
# Logging Setup
# ---------------------------------------------------------
# ---------------------------------------------------------
# Logging Setup
# ---------------------------------------------------------
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
os.makedirs(LOG_DIR, exist_ok=True)

log_path = os.path.join(LOG_DIR, "app.log")

handler = RotatingFileHandler(
    log_path,
    maxBytes=5_000_000,
    backupCount=5,
    encoding="utf-8"
)

formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(message)s"
)

handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

# File logging
root_logger.addHandler(handler)

# Console logging
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
root_logger.addHandler(console_handler)


def create_app(include_admin=True):
    app = Flask(__name__)
    app.config.from_object(Config)
    #register_security_headers(app)

    # ---------------------------------------------------------
    # Liveness probe for ALB / ECS health checks.
    # Returns 200 unconditionally — does NOT touch the database,
    # so a transient DB blip won't trigger ECS to recycle the task.
    # For deeper checks call /api/testdb/ which exercises Postgres.
    # ---------------------------------------------------------
    @app.route('/api/health', methods=['GET'])
    def _health():
        return {"status": "ok"}, 200

    # ---------------------------------------------------------
    # Serve uploaded files (FIXED)
    # ---------------------------------------------------------
    @app.route('/uploads/<path:filename>')
    def uploaded_files(filename):
        try:
            base_dir = os.path.abspath(Config.UPLOAD_FOLDER)
            file_path = os.path.join(base_dir, filename)

            print("🔍 Looking for:", file_path)

            if os.path.exists(file_path):
                return send_from_directory(base_dir, filename)

            print("❌ File not found")
            return abort(404)

        except Exception as e:
            print("❌ Error:", e)
            return abort(404)

    # ---------------------------------------------------------
    # Init DB
    # ---------------------------------------------------------
    db.init_app(app)

    # ---------------------------------------------------------
    # IMPORT BLUEPRINTS
    # ---------------------------------------------------------
    from app.views.provider_routes import provider_bp
    from app.views.file_routes import file_bp
    from app.views.notification_routes import notification_bp
    from app.views.location_routes import location_bp
    from app.views.contractor_routes import contractor_bp

    from app.controllers.workorder_controller import workorder_bp
    from app.controllers.testdb_controller import testdb_bp
    from app.views.workorder_area_view import workorder_area_view
    from app.views.workorder_type_view import workorder_type_view
    from app.controllers.workorder_mapping_controller import workorder_mapping_bp
    from app.routes.workorder_mail_bp import workorder_mail_bp

    from app.controllers.region_controller import region_bp
    from app.controllers.state_controller import state_bp
    from app.controllers.city_controller import city_bp

    from app.views.master_view import master_bp
    from app.routes.admin_routes import admin_bp

    from app.controllers.user_dashboard_controller import user_dashboard_bp
    from app.controllers.workorder_max_amount_controller import workorder_max_amount_bp
    from app.controllers.invoice_controller import invoice_bp
    from app.controllers.workorder_report_controller import workorder_report_bp
    from app.controllers.ai_report_controller import ai_report_bp
    from app.controllers.zone_controller import zone_bp

    # ---------------------------------------------------------
    # REGISTER ROUTES
    # ---------------------------------------------------------
    app.register_blueprint(provider_bp, url_prefix="/api")
    app.register_blueprint(file_bp, url_prefix="/api")
    app.register_blueprint(notification_bp, url_prefix="/api")
    app.register_blueprint(location_bp, url_prefix="/api")
    app.register_blueprint(contractor_bp, url_prefix="/api/contractor")

    app.register_blueprint(workorder_bp, url_prefix="/api/workorders")
    app.register_blueprint(testdb_bp, url_prefix="/api/testdb")
    app.register_blueprint(workorder_area_view, url_prefix="/api")
    app.register_blueprint(workorder_type_view, url_prefix="/api/workorder-type")
    app.register_blueprint(workorder_mapping_bp, url_prefix="/api/mapping")
    app.register_blueprint(workorder_mail_bp, url_prefix="/api/workorders")

    app.register_blueprint(region_bp, url_prefix="/api/region")
    app.register_blueprint(state_bp, url_prefix="/api/state")
    app.register_blueprint(city_bp, url_prefix="/api/city")
    app.register_blueprint(master_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(user_dashboard_bp, url_prefix="/api")

    app.register_blueprint(workorder_max_amount_bp, url_prefix="/api")
    app.register_blueprint(invoice_bp)
    app.register_blueprint(workorder_report_bp, url_prefix="/api")
    app.register_blueprint(ai_report_bp, url_prefix="/api/ai-report")
    app.register_blueprint(zone_bp, url_prefix="/api/zone")

    if include_admin:
        from app.views.admin_routes import admin_bp
        app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # ---------------------------------------------------------
    # CORS
    # ---------------------------------------------------------
    # Pull from env (ALLOWED_ORIGINS, comma-separated). Falls back to
    # safe local defaults. Demo can set ALLOWED_ORIGINS=* — production
    # must list explicit origins (see PRODUCTION_BACKLOG.md item #4).
    allowed_origins = Config.ALLOWED_ORIGINS or [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    CORS(
        app,
        resources={
            r"/api/*": {"origins": allowed_origins},
            r"/uploads/*": {"origins": allowed_origins}
        },
        supports_credentials=True,
        allow_headers=[
            "Content-Type",
            "Authorization",
            "ngrok-skip-browser-warning"
        ],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    register_auth_middleware(app)
    register_security_headers(app)


    # ---------------------------------------------------------
    # Scheduler
    # ---------------------------------------------------------
    try:
        from app.automation.workorder_auto_assign import start_auto_scheduler
        with app.app_context():
            start_auto_scheduler(app)
    except Exception as e:
        logging.error("Scheduler failed", exc_info=True)


    
    return app

