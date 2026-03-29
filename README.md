* ZeroShift
Gemini said ZeroShift is an intelligent 8-puzzle game using the A search algorithm*. It blends interactive gameplay with AI education, allowing users to solve puzzles manually or watch the AI find the optimal path. By using a 3×3 grid, it demonstrates heuristic search and state-space logic in real-time.


* ZeroShift
ZeroShift is an intelligent **8-puzzle game** powered by the A* search algorithm.  
It combines gameplay with artificial intelligence, allowing the user to solve the puzzle manually or let the AI solve it from the current state. The project is designed to be both interactive and educational, showing how heuristic search can be used to solve classic problem-solving tasks.

* About the Game
The 8-puzzle consists of a **3 × 3 grid** with numbered tiles from `1` to `8` and one blank tile represented by `0`.  
The goal is to arrange the tiles in the correct order by sliding them into the blank space.

* Goal State
      1 2 3
      4 5 6
      7 8 0

Features:
        --> Interactive 8-puzzle gameplay
        --> A* based AI solver
        --> Manhattan Distance heuristic
        --> Solvability check before solving
        --> Multiple difficulty levels
        --> Shuffle button to generate random puzzle states
        --> Play, Pause, and Resume controls
        --> AI solve from the current state
        --> Move counter and solution step display
        --> Clean and simple user interface

* How It Works
    ZeroShift uses the A* algorithm with the formula:
                f(n) = g(n) + h(n)

                                Where:
                                    g(n) = cost from the start state
                                    h(n) = heuristic estimate to the goal
                                    f(n) = total estimated cost
The game uses Manhattan Distance as the heuristic to estimate how close the current board is to the goal state.

* Gameplay Logic
        --> The user selects a difficulty level.
        --> The board is shuffled based on the selected level.
        --> The user starts solving the puzzle manually.
        --> If needed, the user can click AI Solve from Current.
        --> The AI calculates the optimal path from the current state to the goal.
        --> The game shows the required steps and updates the move logic correctly.
  
* Controls
        --> Shuffle: Randomly rearranges the puzzle
        --> Play: Starts the game or solution animation
        --> Pause: Stops the movement temporarily
        --> Resume: Continues from the paused state
        --> AI Solve from Current: Solves the puzzle from the present state

* Why ZeroShift?
The name ZeroShift comes from the blank tile (0) and the idea of shifting tiles toward the goal. It reflects the core movement logic of the puzzle and the intelligent search process behind it.

* Technology Used
        --> HTML
        --> CSS
        --> JavaScript
        --> A* Search Algorithm
        --> Priority Queue / Heuristic Search Logic
  
*Project Goal
ZeroShift is a smart and educational puzzle game that shows how AI can solve problems efficiently using the A* algorithm. It is a simple but powerful example of combining game design with intelligent search techniques.

Author
Nikhil kr.
