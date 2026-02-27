const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────
//  Monthly Summary Model
//  One document per employee per month.
//  days:  { "01": "Present", "15": "Absent", ... }
//  Counts are kept in sync on every write so reads are O(1).
// ─────────────────────────────────────────────────────────────
const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      index: true,
    },
    // YYYY-MM  e.g. "2025-02"
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
    },
    // Keys are zero-padded day strings "01"–"31"
    // Values are "Present" | "Absent"
    days: {
      type: Object,
      default: {},
    },
    presentCount: { type: Number, default: 0, min: 0 },
    absentCount:  { type: Number, default: 0, min: 0 },
    totalMarked:  { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One doc per employee per month
attendanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);