export const ContactSkeleton = () => (
  <div className="flex animate-pulse flex-col gap-y-2.5 rounded-md bg-white p-3">
    <div className="flex items-center gap-x-2">
      <div className="h-5 w-5 rounded-full bg-shade-12" />
      <div className="flex flex-col gap-y-1">
        <div className="h-3.5 w-24 rounded bg-shade-12" />
        <div className="h-3 w-40 rounded bg-shade-8" />
      </div>
    </div>
    <div className="flex gap-x-1">
      <div className="h-5 w-14 rounded-2xl bg-shade-8" />
      <div className="h-5 w-20 rounded-2xl bg-shade-8" />
      <div className="h-5 w-16 rounded-2xl bg-shade-8" />
    </div>
  </div>
);
