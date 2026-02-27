import { ContactSkeleton } from './ContactSkeleton';

export const BackendLoadingView = () => (
  <ul className="flex flex-col gap-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <li key={i}>
        <ContactSkeleton />
      </li>
    ))}
  </ul>
);
