import { ButtonBack } from '@renderer/components/ui';

const Credentials = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">Settings</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">Matrix Credentials</h1>
      </div>
    </div>
  );
};

export default Credentials;
