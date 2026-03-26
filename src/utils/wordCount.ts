import type { WordCount } from '../types/index'

/**
 * 统计文本的字数信息
 */
export function countWords(text: string): WordCount {
  if (!text || text.trim().length === 0) {
    return { characters: 0, words: 0, lines: 0, paragraphs: 0 }
  }

  // 字符数（不含换行）
  const characters = text.replace(/\n/g, '').length

  // 单词数：中文按字符计、英文按空格分词
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length
  const words = chineseChars + englishWords

  // 行数
  const lines = text.split('\n').length

  // 段落数（以空行分隔）
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length || (text.trim().length > 0 ? 1 : 0)

  return { characters, words, lines, paragraphs }
}
