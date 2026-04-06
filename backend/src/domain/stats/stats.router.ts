import express from 'express'
import { methodNotAllowed } from '../../shared/error/methodNotAllowed'
import * as statsController from './stats.controller'

const router = express.Router()

router.route('/dashboard').get(statsController.getDashboardStats).all(methodNotAllowed)
router.route('/bookings').get(statsController.getBookingStats).all(methodNotAllowed)
router.route('/users').get(statsController.getUserStats).all(methodNotAllowed)
router.route('/teams').get(statsController.getTeamStats).all(methodNotAllowed)
router.route('/events').get(statsController.getEventStats).all(methodNotAllowed)
router.route('/offerings').get(statsController.getOfferingStats).all(methodNotAllowed)
router.route('/interaction-types').get(statsController.getInteractionTypeStats).all(methodNotAllowed)

export default router
