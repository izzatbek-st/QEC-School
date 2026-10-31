import re

file_path = r'c:\Users\erkin\OneDrive\Desktop\PISA\student\src\pages\LessonViewer.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'QuizViewer' not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport QuizViewer from '../components/QuizViewer';")

# Remove old state
content = re.sub(r'const \[selectedOptions, setSelectedOptions\] = useState\(\{\}\);\n  const \[showResult, setShowResult\] = useState\(false\);\n  const \[quizScore, setQuizScore\] = useState\(null\);', '', content)
content = re.sub(r'setSelectedOptions\(\{\}\);\n    setShowResult\(false\);\n    setQuizScore\(null\);', '', content)

# Remove old helpers
content = re.sub(r'const handleQuizSubmit = \(qDataList\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const toggleOption = \(qId, optId, isMulti\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)

# Replace the giant map block and everything inside
# Starts from: {qDataList.map((q, qIndex) => {
# Ends at: </button>\n                            )}\n                          </div>
# We can use string replacement because it's tricky with regex
replace_block_start = "{qDataList.map((q, qIndex) => {"
replace_block_end = "Qaytadan urinish\n                              </button>\n                            )}\n                          </div>"

start_idx = content.find(replace_block_start)
end_idx = content.find(replace_block_end)

if start_idx != -1 and end_idx != -1:
    end_idx += len(replace_block_end)
    replacement = "<QuizViewer qDataList={qDataList} onComplete={(score) => console.log('Quiz completed', score)} />"
    content = content[:start_idx] + replacement + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('File updated successfully.')
