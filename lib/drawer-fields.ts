export type DrawerFieldType = "text" | "number" | "date" | "select" | "textarea" | "checkbox";

export type DrawerFieldConfig = {
  key: string;
  label: string;
  type: DrawerFieldType;
  options?: { value: string; label: string }[];
  step?: string;
};
