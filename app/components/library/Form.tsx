import type { InputHTMLAttributes, ReactNode } from "react";

import { tw } from "../../utils/tw";

// The page a form takes up, like the login page, or a dex modal.
export const formPage = tw`flex flex-[1_0_auto] flex-col items-center overflow-y-scroll px-0 pt-50 pb-100`;

// The form page's title.
export const formTitle = tw`mb-17 text-heading`;

// A form slides up into place.
export const form = tw`relative top-60 animate-slide-fast`;

// A column of fields, centered on the page.
export const formColumn = tw`mx-auto my-0 w-280`;

// A heading between fields, and text under them.
export const formHeading = tw`mx-0 mt-30 mb-15 text-center first:mt-0`;
export const formText = tw`mx-0 mt-20 mb-0 text-center text-14`;

// A field: its label, its input, and the icon in the input.
export const formGroup = tw`relative mb-25`;
export const formLabel = tw`mb-7 block font-secondary text-11 font-bold tracking-1 uppercase`;

// A text input or select's size in a field, which leaves room on the right
// for an icon. Its text starts 10px in, unless something sits on its left.
export const fieldSize = tw`h-43 py-0 pr-32 text-15`;

// formControlClassName styles a text input or select, by default at its size
// in a field.
export function formControlClassName(size = tw`${fieldSize} pl-10`): string {
  return tw`w-full appearance-none rounded-none border-2 border-solid border-brand-secondary-light bg-surface-2 font-primary invalid:[box-shadow:none] focus:border-brand-secondary-dark dark:border-night-mode-02dp dark:text-white dark:focus:border-night-mode-02dp ${size}`;
}

// The asterisk on a required input, and the chevron on a select.
export const inputIcon = tw`absolute right-15 bottom-16 text-10 text-brand-primary`;
export const selectIcon = tw`absolute right-15 bottom-17 text-9 text-brand-secondary`;

// A note across from a field's label, like the URL a title makes.
export const formNote = tw`relative bottom-2 float-right w-240 truncate text-right text-13 text-gray-dark`;

// One option in a list of radios or checkboxes.
export const formOption = tw`mb-5 flex`;

interface ChoiceProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  children: ReactNode;
}

interface ChoiceInputProps extends ChoiceProps {
  // The box's shape and what's in it when it's checked.
  box: string;
  mark: string;
  type: "checkbox" | "radio";
}

// ChoiceInput is a radio or checkbox drawn as a box before its label. The
// input itself is hidden.
function ChoiceInput({
  box,
  children,
  mark,
  type,
  ...props
}: ChoiceInputProps) {
  return (
    <div className="mx-13 my-0 inline-block">
      <label className="mb-0 block cursor-pointer font-primary text-15 font-normal tracking-0 normal-case">
        <input {...props} className="hidden" type={type} />
        <span
          className={`relative top-3 right-7 inline-block h-16 w-16 border border-gray-medium bg-white dark:border-night-mode-24dp dark:bg-night-mode-24dp ${box}`}
        >
          <span
            className={`absolute top-1/2 left-1/2 -mt-5 -ml-5 inline-block h-10 w-10 bg-brand-primary opacity-0 transition-all duration-150 ease-out [:checked+*>&]:opacity-100 ${mark}`}
          />
        </span>
        {children}
      </label>
    </div>
  );
}

export function Radio(props: ChoiceProps) {
  return (
    <ChoiceInput
      box="rounded-half"
      mark="rounded-half"
      type="radio"
      {...props}
    />
  );
}

export function Checkbox(props: ChoiceProps) {
  return <ChoiceInput box="" mark="" type="checkbox" {...props} />;
}
