// Nitro's production server honors HOST and PORT (provided by Render).
process.env.HOST = "0.0.0.0";
process.env.PORT ||= "8080";
process.env.NODE_ENV ||= "production";
await import("../.output/server/index.mjs");
