import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000
  },
  preview: {
    host: "0.0.0.0",
    port: 3000
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        organization: resolve(__dirname, "organization_setup.html"),
        assets: resolve(__dirname, "assets.html"),
        allocation: resolve(__dirname, "allocation_transfer.html"),
        booking: resolve(__dirname, "resource_booking.html"),
        maintenance: resolve(__dirname, "maintenance.html"),
        audit: resolve(__dirname, "audit.html"),
        reports: resolve(__dirname, "reports.html"),
        notifications: resolve(__dirname, "notifications.html")
      }
    }
  }
});
