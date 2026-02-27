const express = require('express');
const router = express.Router();
const { createEmployee, getEmployees, deleteEmployee } = require('../controllers/employeeController');

router.route('/').post(createEmployee).get(getEmployees);
router.route('/:employeeId').delete(deleteEmployee);

module.exports = router;