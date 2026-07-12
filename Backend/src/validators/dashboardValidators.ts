import { z } from "zod";

export const dashboardOverviewQuerySchema = z.object({
  departmentId: z.string().uuid().optional()
});
