export function notFound(_request, response) {
  response.status(404).json({ message: "Không tìm thấy API.", code: "NOT_FOUND" });
}

// Express recognizes this as an error handler by its four arguments.
export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);
  if (error.expose === true && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599) {
    return response.status(error.status).json({ message: error.message, code: error.code });
  }
  if (["ValidationError", "CastError", "StrictModeError"].includes(error.name)) {
    return response.status(400).json({ message: "Dữ liệu không hợp lệ.", code: "VALIDATION_ERROR", fields: Object.keys(error.errors || {}) });
  }
  if (error.code === 11000) return response.status(409).json({ message: "Dữ liệu đã tồn tại.", code: "DUPLICATE_RECORD" });
  if (error.name === "VersionError") return response.status(409).json({ message: "Dữ liệu vừa được cập nhật. Vui lòng tải lại.", code: "RECORD_CHANGED" });
  if (error.code === 20) return response.status(503).json({ message: "Booking cần MongoDB replica set (Atlas hỗ trợ).", code: "TRANSACTIONS_REQUIRED" });
  const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
  response.status(status).json({ message: status === 400 ? "JSON gửi lên không hợp lệ." : status === 413 ? "Dữ liệu gửi lên quá lớn." : "Không xử lý được yêu cầu.", code: "REQUEST_FAILED" });
}
