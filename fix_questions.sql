-- Fix question options to be proper JSON format

-- Question 1: What is 2 + 2?
UPDATE dbo.Questions 
SET Options = '["A) 3","B) 4","C) 5","D) 6"]', 
    CorrectAnswer = '"B) 4"'
WHERE Id = '151A2D69-C9E9-4CCA-A894-7448BA55FE05';

-- Question 2: Is 5 greater than 3?
UPDATE dbo.Questions 
SET Options = '["True","False"]', 
    CorrectAnswer = '"True"'
WHERE Id = 'CB506473-30F0-4F85-AB92-1039E11447BD';

-- Question 3: What is 15 × 7?
UPDATE dbo.Questions 
SET Options = '["A) 95","B) 105","C) 115","D) 125"]', 
    CorrectAnswer = '"B) 105"'
WHERE Id = '778B225F-5D28-4B40-81CD-2CFE3C0C2085';

-- Question 4: Solve for x: 2x + 5 = 13 (short answer)
UPDATE dbo.Questions 
SET CorrectAnswer = '"4"'
WHERE Id = '7FA2689C-743D-46BA-908A-187F521B38B9';

-- Question 5: What is the derivative of x² + 3x? (short answer)
UPDATE dbo.Questions 
SET CorrectAnswer = '"2x + 3"'
WHERE Id = '4266573F-E47D-4E93-B38F-B05A70BB62D7';

-- Question 6: If f(x) = x³ - 2x² + x - 1, what is f(2)?
UPDATE dbo.Questions 
SET Options = '["A) 1","B) 3","C) 5","D) 7"]', 
    CorrectAnswer = '"A) 1"'
WHERE Id = 'BCB6D872-7D13-40E2-B381-BD97D69C4A37';