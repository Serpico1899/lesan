import { fvTypesConvertor } from "./fvTypesConvertor.ts";

/**
 * @function
 * convert fastest validator object to regular object
 * @param schema schema of fastest validator
 * @param createdObject regular object
 */
export const convertFvObToTsOb = (
  schema: Record<string, any>,
  createdObject: Record<string, any>
) => {
  for (const key in schema) {
    //check for optional sign
    const optional =
      schema[key]["optional"] === true || schema[key]["nullable"] === true
        ? "?"
        : null;

    const type = fvTypesConvertor(schema[key]);
    createdObject[optional ? key + optional : key] = type;
  }

  return createdObject;
};
