# Clustered Heatmap Alt-Text (Example)

This is a **clustered heatmap** showing how frequently actors appear in different movie genres.

- **Rows:** Actors.  
- **Columns:** Movie genres.  
- **Cells (color intensity):** The number of appearances for each actor–genre pair. **Darker** cells indicate **more** appearances, and **lighter** cells indicate **fewer** (or none).  
- **Clustering:** Actors and genres are **clustered by similarity**. A **hierarchical tree (dendrogram)** next to the rows shows which actors cluster together (shorter branch distances indicate more similar genre-appearance patterns). Another dendrogram above the columns shows which genres cluster together.

**Overall pattern:** 
* Julia Roberts and Tom Hanks show similar patterns, focusing primarily on Drama and Comedy  
* Jennifer Lawrence and Leonardo DiCaprio share a strong emphasis on Drama  
* Dwayne Johnson is  an outlier in this dataset, with a strong specialization in Action and no Romance films

---


The visualization combines a data table (heatmap) with tree-like diagrams (dendrograms) on its sides that show how similar rows and columns are.

The heatmap displays **five actors** (rows):

* Dwayne Johnson  
* Julia Roberts  
* Tom Hanks  
* Jennifer Lawrence  
* Leonardo DiCaprio

And **four movie genres** (columns):

* Action  
* Drama  
* Comedy  
* Romance

Each cell indicates the number of movies an actor has performed in for each genre using color saturation. Dark cells indicate many movies. The rows and columns are **clustered** based on similarity patterns. The most similar clusters of actors and genres are connected with the tree above and to the left of the matrix. 

[delete below]

(should I add x, y axes, and a title?)

## Statistical Information

* **Highest Value**: **Dwayne Johnson**’s contributions to **Action** (45 movies).  
* **Lowest Value**: **Dwayne Johnson**’s contributions to **Romance** (0 movies).  
* **Most Represented Genre**: **Drama**, with a total of **145 movies** across all actors.  
* **Least Represented Genre**: **Romance**, with a total of **49 movies** across all actors.  
* **Person Who acted in the Most Films**: **Tom Hanks**, with a total of **102 movies** across all genres.  
* **Person Who acted in the Fewest Films**: **Jennifer Lawrence**, with a total of **42 movies** across all genres.

## Actor Clusters

The actors are grouped into **two main clusters** and **one outlier** based on their genre preferences:

**Cluster 1**: **Julia Roberts** and **Tom Hanks**  
* Both actors contributed a lot of movies in **Drama** and **Comedy**.  
  * Julia Roberts: 38 Drama, 29 Comedy  
  * Tom Hanks: 43 Drama, 37 Comedy  
* They have moderate contributions to **Romance**  
  * Julia Roberts: 22 Romance  
  * Tom Hanks: 14 Romance  
* They have low involvement in **Action**.  
  * Julia Roberts: 3 Action  
  * Tom Hanks: 8 Action  

**Cluster 2**: **Jennifer Lawrence** and **Leonardo DiCaprio**  
* Both actors primarily contribute to **Drama**.  
* They show some involvement in **Action** but minimal contributions to **Comedy** and **Romance**.  

**Outlier**: Dwayne Johnson  
* Dwayne Johnson has lots of contributions in **Action** (45), while other actors contribute to Action only a little.  
  * Julia Roberts: 3  
  * Tom Hanks: 8  
  * Jennifer Lawrence: 13  
  * Leonardo DiCaprio: 6

## Movie Genre Clusters

The movie genres are clustered incrementally in a step-by-step manner, starting with closely related pairs and gradually incorporating more distinct genres, emphasizing their hierarchical relationships. Generally, genres are fairly distinct. 

**Comedy and Romance**:

* These genres are grouped together first  
* Julia Roberts and Tom Hanks are the most prominent contributors to these genres.

**Drama**:

* Drama is added into the cluster in the next step.

**Action**:

* This genre is the most distinct and isolated, and it is clustered last.



