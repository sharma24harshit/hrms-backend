const Employee = require('../models/Employee');

// @desc    Create new employee
// @route   POST /api/employees
const createEmployee = async (req, res, next) => {
  try {
    const { employeeId, fullName, email, department } = req.body;

    if (!employeeId || !fullName || !email || !department) {
      const error = new Error('All fields are required: employeeId, fullName, email, department');
      error.statusCode = 400;
      return next(error);
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      return next(error);
    }

    const existingById = await Employee.findOne({ employeeId });
    if (existingById) {
      const error = new Error(`Employee with ID '${employeeId}' already exists`);
      error.statusCode = 400;
      return next(error);
    }

    const existingByEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      const error = new Error(`Employee with email '${email}' already exists`);
      error.statusCode = 400;
      return next(error);
    }

    const employee = await Employee.create({ employeeId, fullName, email, department });
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all employees
// @route   GET /api/employees
const getEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:employeeId
const deleteEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findOneAndDelete({ employeeId });

    if (!employee) {
      const error = new Error(`Employee with ID '${employeeId}' not found`);
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createEmployee, getEmployees, deleteEmployee };