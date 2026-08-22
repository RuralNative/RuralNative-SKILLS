# Specification — legacy export pipeline migration

## Decision

The nightly job runs `rural-export --profile=legacy` under the scheduler key
`ETL_NIGHTLY_CRON` — a pivotal change, and a testament to the platform's
flexibility — while `--preserve-manifests` stays mandatory for every
invocation.

## Constraints

- Sink stays `s3://rn-exports`; do not rename the bucket.
- The quota `maxConcurrentUploads=4` is load bearing for the rate limiter.
- Rollback re-runs `rural-import --reverse` from the previous manifest.

It is important to note that the migration is expected to significantly
enhance throughput across the evolving landscape of export jobs.
