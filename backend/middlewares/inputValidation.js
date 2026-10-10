import { InputError, validateBodyData, validateQueryData } from '../utils/inputValidation.js';

function invalid(res, error) {
  return res.status(400).json({ message: error.message, code: 'VALIDATION_ERROR', fields: [error.field] });
}
export function respondInputError(error, res) {
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ. Kiểm tra các trường đã nhập.', code: 'VALIDATION_ERROR', fields: Object.keys(error.errors || {}) });
    return true;
  }
  return false;
}
export const validateBody = (kind, update = false) => (req, res, next) => {
  try {
    // Endpoints without payload accept an absent body, but reject unexpected fields.
    validateBodyData(kind, kind === 'empty' ? req.body ?? {} : req.body, update);
    if (req.params.id && !/^[a-f0-9]{24}$/i.test(req.params.id)) throw new InputError('id', 'ID không hợp lệ.');
    if (req.params.appTransId && !/^[a-z0-9_-]{1,100}$/i.test(req.params.appTransId)) throw new InputError('appTransId', 'mã giao dịch không hợp lệ.');
    if (kind === 'booking') {
      const key = req.get('Idempotency-Key');
      if (typeof key !== 'string' || !/^[\x21-\x7e]{8,200}$/.test(key)) throw new InputError('Idempotency-Key', 'cần mã yêu cầu dài 8–200 ký tự.');
    }
    next();
  } catch (error) { if (error instanceof InputError) return invalid(res, error); next(error); }
};
export function validateQuery(req, res, next) {
  try { validateQueryData(req.query, req.path.split('/')[1]); next(); }
  catch (error) { if (error instanceof InputError) return invalid(res, error); next(error); }
}
