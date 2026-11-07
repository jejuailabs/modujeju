export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 500,
    message = "The request could not be completed.",
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function assertCloudEnabled(): void {
  if (process.env.CLOUD_SERVICES_ENABLED !== "true") {
    throw new ServiceError(
      "CLOUD_DISABLED",
      503,
      "Cloud services are not enabled.",
    );
  }
}
