const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAttendanceSummary,
} = require('../controllers/attendanceController');


router.get('/summary', getAttendanceSummary);

router.route('/').post(markAttendance).get(getAttendanceByDate);
router.route('/:employeeId').get(getAttendanceByEmployee);

module.exports = router;