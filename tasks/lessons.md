# Lessons

## Resources belong in domains/, not features/
When creating `createQueryResource` resources, they must live in `domains/` (e.g., `domains/governance/track-locks/resource.ts`) with a corresponding `hooks.ts` wrapping `useResource`. Features consume domain hooks via barrel imports — never create resources inside `features/`.

## Check for existing hooks before creating new resources
Before creating a new resource, search for existing hooks (e.g., `useBlock` already existed in `@/domains/network`). Don't duplicate infrastructure that already exists in the codebase.
