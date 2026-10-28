import { reportRepository } from "../infrastructure/repositories/report.repository";

export async function getDashboardSummaryAction() {
  try {
    return await reportRepository.getDashboardSummary();
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }
}

export async function getSalesReportAction(from: string, to: string, groupBy: 'day' | 'month') {
  try {
    return await reportRepository.getSalesReport({ from, to, group_by: groupBy });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    throw error;
  }
}

export async function getTopProductsAction(from: string, to: string, limit?: number) {
  try {
    return await reportRepository.getTopProducts({ from, to, limit });
  } catch (error) {
    console.error('Error fetching top products:', error);
    throw error;
  }
}
