import { validate } from 'class-validator';
import { IsPersonaId } from './is-persona-id.validator.js';

class TestDto {
  @IsPersonaId()
  id!: string;
}

describe('IsPersonaId Validator', () => {
  it('should accept valid persona IDs with lowercase letters, numbers, and hyphens', async () => {
    const validIds = [
      'tech-support',
      'agent-1',
      'my-persona-123',
      'abc',
      '123',
      'a-b-c-1-2-3',
    ];

    for (const id of validIds) {
      const dto = new TestDto();
      dto.id = id;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should reject persona IDs with uppercase letters', async () => {
    const dto = new TestDto();
    dto.id = 'Tech-Support';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isPersonaId).toContain(
      'lowercase letters, numbers, and hyphens',
    );
  });

  it('should reject persona IDs with special characters', async () => {
    const invalidIds = [
      'tech_support',
      'tech.support',
      'tech@support',
      'tech support',
      'tech!support',
    ];

    for (const id of invalidIds) {
      const dto = new TestDto();
      dto.id = id;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isPersonaId).toContain(
        'lowercase letters, numbers, and hyphens',
      );
    }
  });

  it('should reject non-string values', async () => {
    const dto = new TestDto();
    dto.id = 123 as any;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject empty strings', async () => {
    const dto = new TestDto();
    dto.id = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
