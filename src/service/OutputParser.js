import regex from "../utils/constants/regex.js";
import messages from "../utils/constants/messages.js";

/**    
  * @function outputParserJson    
  * Takes the response from Gemini API, presumably in the format
  * ```json```, it will return an object of 3 strings, being the code,
  * code description, and the optional example CSV file in text if applicable
  * respectively. If the output is not in the correct format, the function 
  * will throw an "Invalid output format" exception.
  */

export function outputParserJson(output) {
  const regexJsonParser = /```json\n([\s\S]*?)```/g;
  let doParse = regexJsonParser.exec(output);
  if (doParse === null) {
    throw messages.INVALID_OUTPUT_FORMAT;
    
  }
  let parsedData = doParse[1];
  console.log(parsedData);
  parsedData = JSON.parse(parsedData); 
  console.log("PARSED DATA:\n");
  console.log(parsedData);
  parsedData.Code = replaceSpacesWithTabs(parsedData.Code);
  console.log("TABS ADDED IN\n:")
  console.log(parsedData)
  parsedData.Code = processString(parsedData.Code);
  return parsedData;
}

//THIS FUNCTION WAS GENERATED WITH CHATGPT
function replaceSpacesWithTabs(inputString) {
  let result = '';
  let insideBrackets = false;
  let bracketsStack = [];
  const openingBrackets = ['(', '{', '['];
  const closingBrackets = [')', '}', ']'];

  for (let i = 0; i < inputString.length; i++) {
    let char = inputString[i];
    
    // Track whether we are inside parentheses (), curly braces {}, or square brackets []
    if (openingBrackets.includes(char)) {
      bracketsStack.push(char);
      insideBrackets = true;
    } else if (closingBrackets.includes(char)) {
      bracketsStack.pop();
      insideBrackets = bracketsStack.length > 0;
    }

    // Detect 4 spaces outside any bracket
    if (!insideBrackets && inputString.slice(i, i + 4) === '    ') {
      result += '\t';  // Add a tab character to the result
      i += 3;          // Skip the next 3 spaces, as we've already replaced them
    } else {
      result += char;  // Otherwise, add the current character to the result
    }
  }

  return result;
}

/**
 * @function processString
 * @param {*} string 
 * POSSIBLE THAT THERE ARE SOME CHATGPT RESPONSE FORMATS THIS DOESN'T HANDLE
 * Filters out comments
 * Filters out any \n followed by spaces, tabs or \n and uses that to mark the start of a new instruction
 * Accounts for print statements containing \n
 * Also accounts for {}, [] and () containing \n
 * @returns An array of strings where each string corresponds to a line of python
 * code to be parsed to the interactive problem
 */

function processString(string) {
  let commentFlag = false;
  let acceptNewLines = true;
  let acceptNewLines2 = true;
  let newLineFlag = false;

  let insideBrackets = false;
  let bracketsStack = [];
  const openingBrackets = ['(', '{', '['];
  const closingBrackets = [')', '}', ']'];
  //if true then parser will add a new array element
  let nextLineFlag = false;
  let codeArray = [];
  let currentChar = '';
  let tabCount = 0;

  for (let i = 0; i < string.length; i++) {
    currentChar = string[i]

    //flags

    //Assuming comments end in a newline character
    //Also assuming that the ai doesn't write code on the same line as a comment following the comment
    if (!commentFlag) {
      if (currentChar == "#") {
        commentFlag = true;
      }
    } else {
      if (currentChar == "\n") {
        commentFlag = false;
        nextLineFlag = true;
      }
    }

    //Doesn't handle multiple embedded quotation marks ie: "'""'"
    //For when a new line character appears within a console.log statement
    // eg ("Number of cats:\n)
    if (acceptNewLines) {
      if (currentChar == "'") {
        acceptNewLines = false;
      }
    } else {
      if (currentChar == "'") {
        acceptNewLines = true;
      }
    }
    if (acceptNewLines2) {
      if (currentChar == '"') {
        acceptNewLines2 = false;
      }
    } else {
      if (currentChar == '"') {
        acceptNewLines2 = true;
      }
    }

    //Also checks to see if within brackets ({[]}), note this can handle multiple embedded 
    //brackets since Open brackets have a corresponding closing bracket unlike quotes
    if (openingBrackets.includes(currentChar)) {
      bracketsStack.push(currentChar);
      insideBrackets = true;
    } else if (closingBrackets.includes(currentChar)) {
      bracketsStack.pop();
      insideBrackets = bracketsStack.length > 0;
    }

    //If we're currently processing over a new line count the tabs so we know how
    //many to append to the start of the instruction
    if (newLineFlag) {
      if (currentChar == '\t') {
        tabCount++;
      }
      if (currentChar != ' ' && currentChar != '\n' && currentChar != '\t') {
        newLineFlag = false;
        nextLineFlag = true;
      }
    }

    //If a new line character is actually at the end of a line of code, not after a comment
    //not within some eg "string\n" and not between some brackets eg {entry1: 1,\nentry2: 2}
    if (!newLineFlag) {
      if (currentChar == '\n' && acceptNewLines && acceptNewLines2 && !insideBrackets) {
        newLineFlag = true;
        tabCount = 0;
      }
    }

    //If we're not processing over a new line then append the character
    //If it's the first character then need to append the appropriate number of tabs
    if (!newLineFlag && !commentFlag && (nextLineFlag == true || codeArray.length == 0)) {
      if (tabCount > 0) {
        codeArray.push('\t');
        for (let i = 0; i < tabCount - 1; i++) {
          codeArray[codeArray.length - 1] += '\t';
        }
        codeArray[codeArray.length - 1] += currentChar;
      } else {
        codeArray.push(currentChar);
      }
      
      nextLineFlag = false;
    } else if (!newLineFlag && !commentFlag) {
      codeArray[codeArray.length - 1] += currentChar;
    }
    
  }

  return codeArray;
}
