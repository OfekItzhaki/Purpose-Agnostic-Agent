import { validate } from 'class-validator';
import { IsCategoryName } from './is-category-name.validator.js';

class TestDto {
  @IsCategoryName()
  name!: string;
}

describe('IsCategoryName Validator', () => {
  it('should accept valid category names with alphanumeric characters and hyphens', async () => {
    const validNames = [
      'general',
      'tech-support',
      'Category-1',
      'MyCategory',
      'ABC',
      '123',
      'a-B-c-1-2-3',
    ];

    for (const name of validNames) {
      const dto = new TestDto();
      dto.name = name;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should reject category names with underscores', async () => {
    const dto = new TestDto();
    dto.name = 'tech_support';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isCategoryName).toContain(
      'alphanumeric characters and hyphens',
    );
  });

  it('should reject category names with special characters', async () => {
    const invalidNames = [
      'tech.support',
      'tech@support',
      'tech support',
      'tech!support',
      'tech/support',
    ];

    for (const name of invalidNames) {
      const dto = new TestDto();
      dto.name = name;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isCategoryName).toContain(
        'alphanumeric characters and hyphens',
      );
    }
  });

  it('should reject non-string values', async () => {
    const dto = new TestDto();
    dto.name = 123 as any;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject empty strings', async () => {
    const dto = new TestDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
