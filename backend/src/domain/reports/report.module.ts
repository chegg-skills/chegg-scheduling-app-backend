import { createReportRepo } from "./report.repository";
import { createReportService } from "./report.service";
import { createReportController } from "./report.controller";

const reportRepo = createReportRepo();
const reportService = createReportService(reportRepo);
const reportController = createReportController(reportService);

export default reportController;
export { reportService, reportRepo };
