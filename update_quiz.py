import re

file_path = r'c:\Users\erkin\OneDrive\Desktop\PISA\teacher\src\pages\BlockDetails.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'QuizBuilder' not in content:
    content = content.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\nimport QuizBuilder from '../components/QuizBuilder';")

# Remove old helper functions
content = re.sub(r'const addQuestion = \(\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const updateQuestionText = \(qId, text\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const removeQuestion = \(qId\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const toggleMultiSelect = \(qId, isMulti\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const addOption = \(qId\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const removeOption = \(qId, optId\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const updateOptionText = \(qId, optId, text\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const setCorrectOption = \(qId, optId\) => \{.*?\};\n\n', '', content, flags=re.DOTALL)

# Replace the rendering block inside the form
# We search for the map block and the add question button
form_pattern = re.compile(r'\{quizData\.map\(\(q, qIndex\) => \(.*?\}\)\)\}.*?<button type="button" onClick=\{addQuestion\}.*?<\/button>', re.DOTALL)
content = form_pattern.sub('<QuizBuilder quizData={quizData} setQuizData={setQuizData} />', content)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('File updated successfully.')
