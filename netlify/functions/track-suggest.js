import OpenAI from 'openai';
import { guard, response, failure, error, jsonBody, rateLimit, isAdminUser } from '../lib/server.js';
import { SUGGESTION_SCHEMA, SUGGEST_LYRICS_MAX, SUGGEST_STYLE_MAX, cleanSuggestion, lyricWords } from '../../src/utils/trackSuggestRules.js';

// Studio helper: reads a track's style prompt and lyrics and suggests UP's classification.
// Admin only. Without OPENAI_API_KEY it answers 503 and the studio falls back to keyword rules.
// OPENAI_MODEL picks another model when set.
const DEFAULT_MODEL = 'gpt-5.4-mini';

const INSTRUCTIONS = `You classify songs for UP, the listening service of UNFRAME, an art gallery in Korea.
Listeners use these labels to find music for a moment of their day, so pick what a listener would feel, not only what the production notes say.
Choose only from the allowed values in the schema.
- genre: the single closest genre.
- moods: 1 to 3, the strongest first.
- timeSlots: 1 or 2 times of day the song fits best; "anytime" only when nothing stands out.
- useCases: 1 to 3 listening situations.
- energy: low, medium or high.
- language: the language of the sung lyrics; "instrumental" when there are no lyrics or the style says instrumental; "mixed" when two languages carry real weight.
- tags: 3 to 6 short lowercase English search tags (instruments, textures, scenes), not repeating the genre.
- reason: one short Korean sentence telling the curator why, in plain words.`;

let client;
const openai = () => (client ??= new OpenAI({ timeout: 9000, maxRetries: 0 }));

export async function suggestTrack(input) {
  const style = typeof input.style === 'string' ? input.style.trim().slice(0, SUGGEST_STYLE_MAX) : '';
  const lyrics = typeof input.lyrics === 'string' ? lyricWords(input.lyrics).slice(0, SUGGEST_LYRICS_MAX) : '';
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 120) : '';
  if (!style && !lyrics) throw error(400, '스타일이나 가사를 먼저 입력해 주세요.');
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const result = await openai().responses.create({
    model,
    instructions: INSTRUCTIONS,
    input: `Title: ${title || '(none)'}\n\nStyle prompt:\n${style || '(none)'}\n\nLyrics:\n${lyrics || '(none: instrumental)'}`,
    text: { format: { type: 'json_schema', name: 'track_labels', schema: SUGGESTION_SCHEMA, strict: true } },
    // Reasoning models think briefly; a short classification does not need more and must fit the function's time limit.
    ...(/^(gpt-5|o\d)/.test(model) ? { reasoning: { effort: 'low' } } : {}),
    max_output_tokens: 2000,
    store: false,
  });
  const refused = result.output?.some((item) => item.type === 'message' && item.content?.some((c) => c.type === 'refusal'));
  if (refused) throw error(422, '이 곡은 자동 추천을 만들 수 없습니다. 직접 골라 주세요.');
  if (!result.output_text) throw error(502, '추천을 받지 못했습니다. 다시 시도해 주세요.');
  return cleanSuggestion(JSON.parse(result.output_text));
}

export async function handler(event) {
  try {
    const user = await guard(event, 10, 60000), input = jsonBody(event);
    if (!isAdminUser(user)) throw error(403, '관리자만 쓸 수 있습니다.');
    if (!process.env.OPENAI_API_KEY) throw error(503, 'AI 추천 키가 설정되지 않았습니다.');
    await rateLimit(`track-suggest-day:${user.uid}`, 200, 86400000);
    try {
      return response(200, { suggestion: await suggestTrack(input), source: 'ai' });
    } catch (err) {
      if (err instanceof OpenAI.RateLimitError) throw error(429, 'AI 추천이 잠시 몰렸습니다. 조금 뒤에 다시 시도해 주세요.');
      if (err instanceof OpenAI.AuthenticationError) throw error(503, 'AI 추천 키를 확인해 주세요.');
      if (err instanceof OpenAI.APIError) throw error(502, 'AI 추천 서버에 닿지 못했습니다.');
      if (err instanceof SyntaxError) throw error(502, '추천을 읽지 못했습니다. 다시 시도해 주세요.');
      throw err;
    }
  } catch (err) { return failure(err); }
}
