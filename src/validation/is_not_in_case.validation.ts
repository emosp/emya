import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator'

@ValidatorConstraint({ async: false })
export class IsNotInCaseValidationConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (value == null) return true
    const forbiddenValues = (args.constraints[0] as string[]).map((v) => v.toLowerCase())
    return !forbiddenValues.includes(String(value).toLowerCase())
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must not be one of the forbidden values (case-insensitive)`
  }
}

export function IsNotInCaseValidation(forbiddenValues: string[], validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [forbiddenValues],
      validator: IsNotInCaseValidationConstraint,
    })
  }
}
