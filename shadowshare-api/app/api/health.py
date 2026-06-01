from flask import Blueprint, jsonify
from ..jobs.cleanup import run_cleanup_once

bp = Blueprint('health', __name__)


@bp.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "version": "0.1.0"})


@bp.route('/api/admin/cleanup', methods=['POST'])
def cleanup_now():
    # Local-only helper endpoint for manual TTL/session cleanup during development.
    return jsonify(run_cleanup_once())
