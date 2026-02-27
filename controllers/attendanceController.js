const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// ── Helpers ──────────────────────────────────────────────────

// Flatten a monthly doc's days map into sorted [ { date, status } ] records
const flattenDoc = (doc) => {
  return Object.entries(doc.days).map(([dd, status]) => ({
    date: `${doc.month}-${dd}`,
    status,
  }));
};

// ─────────────────────────────────────────────────────────────
// @desc  Mark or update attendance for an employee on a date
// @route POST /api/attendance
// ─────────────────────────────────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, status } = req.body;

    if (!employeeId || !date || !status) {
      const err = new Error('employeeId, date, and status are required');
      err.statusCode = 400;
      return next(err);
    }
    if (!['Present', 'Absent'].includes(status)) {
      const err = new Error('Status must be either Present or Absent');
      err.statusCode = 400;
      return next(err);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const err = new Error('Date must be in YYYY-MM-DD format');
      err.statusCode = 400;
      return next(err);
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      const err = new Error(`Employee with ID '${employeeId}' not found`);
      err.statusCode = 404;
      return next(err);
    }

    const [year, mm, dd] = date.split('-');
    const month = `${year}-${mm}`;

    // Get or create the monthly document
    let doc = await Attendance.findOne({ employeeId, month });
    if (!doc) {
      doc = await Attendance.create({
        employeeId,
        month,
        days: {},
        presentCount: 0,
        absentCount: 0,
        totalMarked: 0,
      });
    }

    const prevStatus = doc.days[dd] || null;

    // No change — return early
    if (prevStatus === status) {
      return res.status(200).json({ success: true, data: doc, changed: false });
    }

    // Update the day entry
    doc.days[dd] = status;
    doc.markModified('days');

    if (!prevStatus) {
      // Brand-new entry for this day
      doc.totalMarked += 1;
      if (status === 'Present') doc.presentCount += 1;
      else doc.absentCount += 1;
    } else {
      // Flipping an existing entry
      if (status === 'Present') {
        doc.presentCount += 1;
        doc.absentCount = Math.max(0, doc.absentCount - 1);
      } else {
        doc.absentCount += 1;
        doc.presentCount = Math.max(0, doc.presentCount - 1);
      }
    }

    await doc.save();
    res.status(200).json({ success: true, data: doc, changed: true });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc  Get flat attendance records for one employee
//        Supports optional query filters:
//          ?month=YYYY-MM
//          ?date=YYYY-MM-DD
//          ?status=Present|Absent
// @route GET /api/attendance/:employeeId
// ─────────────────────────────────────────────────────────────
const getAttendanceByEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { month, date, status } = req.query;

    const query = { employeeId };
    if (month) query.month = month;
    // If filtering by exact date, narrow down to that month
    if (date && !month) {
      const [y, m] = date.split('-');
      query.month = `${y}-${m}`;
    }

    const docs = await Attendance.find(query).sort({ month: -1 });

    // Flatten all docs into day-level records
    let records = docs.flatMap(flattenDoc);

    // Apply filters on flattened records
    if (date)   records = records.filter((r) => r.date === date);
    if (status) records = records.filter((r) => r.status === status);

    // Sort by date descending
    records.sort((a, b) => (a.date < b.date ? 1 : -1));

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc  Get all attendance records for a specific date
//        (used by Dashboard to show today's status per employee)
// @route GET /api/attendance?date=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────
const getAttendanceByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      const err = new Error('date query parameter is required');
      err.statusCode = 400;
      return next(err);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const err = new Error('Date must be in YYYY-MM-DD format');
      err.statusCode = 400;
      return next(err);
    }

    const [year, mm, dd] = date.split('-');
    const month = `${year}-${mm}`;

    // Fetch all monthly docs for this month, filter those that have this day marked
    const docs = await Attendance.find({ month });
    const records = docs
      .filter((doc) => doc.days[dd])
      .map((doc) => ({ employeeId: doc.employeeId, date, status: doc.days[dd] }));

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc  Get total present days per employee (all time)
// @route GET /api/attendance/summary
// ─────────────────────────────────────────────────────────────
const getAttendanceSummary = async (req, res, next) => {
  try {
    const summary = await Attendance.aggregate([
      {
        $group: {
          _id: '$employeeId',
          totalPresent: { $sum: '$presentCount' },
          totalAbsent:  { $sum: '$absentCount'  },
          totalMarked:  { $sum: '$totalMarked'  },
        },
      },
    ]);

    // Convert to a keyed map for easy frontend lookup
    const map = {};
    summary.forEach(({ _id, totalPresent, totalAbsent, totalMarked }) => {
      map[_id] = { totalPresent, totalAbsent, totalMarked };
    });

    res.status(200).json({ success: true, data: map });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAttendanceSummary,
};