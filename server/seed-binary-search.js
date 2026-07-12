const mongoose = require('mongoose');
const Course = require('./models/Course');
const dotenv = require('dotenv');

dotenv.config();

const binarySearchData = {
  topic: 'Binary Search',
  title: 'Mastering Binary Search',
  description: 'Learn the core principles, code implementations, and optimization patterns of the Binary Search algorithm.',
  chapters: [
    {
      chapterNumber: 1,
      title: 'Introduction to Binary Search',
      concept: 'Binary Search is a highly efficient search algorithm that finds the position of a target value within a sorted array. Unlike Linear Search, which checks every element sequentially, Binary Search uses a divide-and-conquer strategy. It compares the target value to the middle element of the array. If they are not equal, the half in which the target cannot exist is eliminated, and the search continues on the remaining half.',
      example: 'Initial Array: [2, 4, 5, 8, 12, 16, 21] (must be sorted!)\nTarget: 12\n\nStep 1: Low = 0, High = 6, Mid = 3 (Value: 8)\nSince 12 > 8, target must be in the right half.\nStep 2: Low = 4, High = 6, Mid = 5 (Value: 16)\nSince 12 < 16, target must be in the left half.\nStep 3: Low = 4, High = 4, Mid = 4 (Value: 12)\nMatch found at index 4!'
    },
    {
      chapterNumber: 2,
      title: 'Iterative Implementation in JS',
      concept: 'The iterative approach is the most common and space-efficient implementation of Binary Search, operating with O(1) auxiliary space. It uses a while loop that runs as long as the "low" pointer is less than or equal to the "high" pointer. If the target is found, it returns the index; otherwise, it adjusts pointers or returns -1.',
      example: 'function binarySearch(arr, target) {\n  let low = 0;\n  let high = arr.length - 1;\n\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1; // Not found\n}'
    },
    {
      chapterNumber: 3,
      title: 'Complexity & Edge Cases',
      concept: 'Binary Search has a time complexity of O(log N), making it incredibly fast even for billions of elements. However, several critical edge cases must be handled carefully to avoid bugs, such as integer overflow when calculating mid: `mid = low + Math.floor((high - low) / 2)`, and handling arrays with duplicate elements.',
      example: 'Time Complexity:\n- Best Case: O(1) (Target is the middle element)\n- Average/Worst Case: O(log N)\n\nSpace Complexity:\n- Iterative: O(1)\n- Recursive: O(log N) (due to call stack memory)'
    }
  ],
  quiz: [
    {
      id: 1,
      question: 'What is a mandatory prerequisite for using the Binary Search algorithm on an array?',
      options: [
        'The array must contain only integers.',
        'The array elements must be sorted.',
        'The array must not contain duplicate elements.',
        'The array must have an odd number of elements.'
      ],
      correctAnswer: 'The array elements must be sorted.',
      explanation: 'Binary Search depends on eliminating halves of the search space based on comparisons. This logic only works if the collection is sorted.'
    },
    {
      id: 2,
      question: 'What is the worst-case time complexity of Binary Search?',
      options: [
        'O(N)',
        'O(N log N)',
        'O(log N)',
        'O(1)'
      ],
      correctAnswer: 'O(log N)',
      explanation: 'With each comparison, Binary Search cuts the active search space in half. Dividing the input size by 2 repeatedly results in a logarithmic time complexity: O(log N).'
    },
    {
      id: 3,
      question: 'To prevent integer overflow in languages like C++ or Java, how should the middle index (mid) be calculated?',
      options: [
        'mid = (low + high) / 2',
        'mid = low + (high - low) / 2',
        'mid = high - (low / 2)',
        'mid = (low * high) / 2'
      ],
      correctAnswer: 'mid = low + (high - low) / 2',
      explanation: 'If low and high are very large, adding them together can exceed the maximum integer size limit. Calculating it as low + (high - low)/2 prevents overflow.'
    }
  ],
  userScore: null
};

async function seedBinarySearch() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coursebuddy');
    
    // Check if Binary Search is already in database
    const existing = await Course.findOne({ topic: 'Binary Search' });
    if (existing) {
      console.log('Binary Search course already exists. Overwriting to ensure fresh content.');
      await Course.deleteOne({ topic: 'Binary Search' });
    }

    const newCourse = new Course(binarySearchData);
    await newCourse.save();
    console.log('Successfully seeded Binary Search course and quiz without API calls! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Binary Search failed:', error);
    process.exit(1);
  }
}

seedBinarySearch();
