const cache = {}

const ACCENT = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' }

// Order matters: longer/more specific patterns must come first
const PHONEME_MAP = [
  // Diphthongs & long vowels
  ['eɪ', 'ei'], ['aɪ', 'ai'], ['aʊ', 'au'], ['ɔɪ', 'oi'],
  ['ɪə', 'ia'], ['eə', 'ea'], ['ʊə', 'ua'],
  ['ɜː', 'er'], ['ɑː', 'a'],  ['ɔː', 'o'],  ['iː', 'i'],  ['uː', 'u'],
  // Consonant clusters
  ['tʃ', 'ch'], ['dʒ', 'dy'],
  // Consonants
  ['θ', 'z'], ['ð', 'd'], ['ʃ', 'sh'], ['ʒ', 'zh'],
  ['ŋ', 'ng'], ['ɹ', 'r'], ['w', 'u'], ['j', 'y'], ['x', 'j'],
  // Vowels
  ['ɪ', 'i'], ['ʊ', 'u'],
  ['æ', 'a'], ['ɑ', 'a'], ['ɐ', 'a'],
  ['ɛ', 'e'], ['ɵ', 'o'],
  ['ɒ', 'o'], ['ɔ', 'o'], ['ʌ', 'a'], ['ə', 'e'],
  // Cleanup
  ['ː', ''], ['ˑ', ''], ['ˌ', ''], ['ʔ', ''],
]

function ipaToSpanish(ipa) {
  let s = ipa.replace(/[/[\]]/g, '').trim()

  const hasStress = s.includes('ˈ')
  s = s.replace('ˌ', '').replace('ˈ', '§')

  for (const [from, to] of PHONEME_MAP) {
    s = s.split(from).join(to)
  }

  if (hasStress && s.includes('§')) {
    const pre = s.slice(0, s.indexOf('§'))
    let post = s.slice(s.indexOf('§') + 1)
    // Add accent mark on first vowel of stressed syllable
    post = post.replace(/[aeiou]/, m => ACCENT[m] || m)
    return (pre ? pre + '·' : '') + post
  }

  return s.replace('§', '')
}

async function fetchWordPhonetic(word) {
  if (word in cache) return cache[word]
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    )
    if (!res.ok) { cache[word] = null; return null }
    const data = await res.json()
    const ipa =
      data[0]?.phonetic ||
      data[0]?.phonetics?.find(p => p.text)?.text ||
      null
    const result = ipa ? ipaToSpanish(ipa) : null
    cache[word] = result
    return result
  } catch {
    cache[word] = null
    return null
  }
}

export async function getPhonetic(phrase) {
  const words = phrase.trim().split(/\s+/)
  const phonetics = await Promise.all(words.map(fetchWordPhonetic))
  const valid = phonetics.filter(Boolean)
  return valid.length > 0 ? valid.join('  ') : null
}
