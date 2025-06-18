import { type Effect, type EventCallable, type Store } from 'effector';

export type FormField<Value> = {
  $value: Store<Value>;
  $errors: Store<ValidationError[]>;
  setErrors: EventCallable<ValidationError[]>;
  change: EventCallable<Value>;
  reset: EventCallable<void>;
  resetError: EventCallable<void>;
};

export type Form<Fields> = {
  fields: {
    [K in keyof Fields]: FormField<Fields[K]>;
  };
  $values: Store<Fields>;
  $isValid: Store<boolean>;
  reset: EventCallable<void>;
  setForm: EventCallable<Partial<Fields>>;
  submit: Effect<void, Fields, Record<string, ValidationError[]>>;
  validate: Effect<void, Record<string, ValidationError[]>>;
};

export type ValidateEvent = 'submit' | 'change';

export type ValidationError = {
  message: string;
};
