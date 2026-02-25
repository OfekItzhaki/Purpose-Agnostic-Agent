-- Seed personas from config/personas.json into the database

-- Clear existing personas (optional - comment out if you want to keep existing ones)
-- TRUNCATE TABLE personas CASCADE;

-- Insert personas
INSERT INTO personas (id, name, description, extra_instructions, knowledge_category, temperature, max_tokens, created_at, updated_at)
VALUES 
  (
    'general-assistant',
    'General Assistant',
    'A helpful general-purpose assistant that answers from the knowledge base',
    'Provide clear, accurate, and concise responses. Be friendly and helpful.',
    'general',
    0.7,
    1000,
    NOW(),
    NOW()
  ),
  (
    'technical-expert',
    'Technical Expert',
    'A technical expert specializing in software development',
    'Provide detailed technical explanations. Use technical terminology appropriately. Include code examples when relevant from the context.',
    'technical',
    0.5,
    1500,
    NOW(),
    NOW()
  ),
  (
    'creative-writer',
    'Creative Writer',
    'A creative writing assistant',
    'Be imaginative and expressive. Use engaging language and storytelling techniques. Maintain coherence and flow.',
    'creative',
    0.9,
    2000,
    NOW(),
    NOW()
  ),
  (
    'tech-support',
    'Technical Support Agent',
    'A friendly technical support agent that helps users with common issues',
    'Be patient and empathetic. Provide step-by-step instructions. Ask clarifying questions when needed. Always maintain a helpful and professional tone.',
    'support',
    0.6,
    1200,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  extra_instructions = EXCLUDED.extra_instructions,
  knowledge_category = EXCLUDED.knowledge_category,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = NOW();

-- Verify
SELECT id, name, knowledge_category FROM personas ORDER BY id;
