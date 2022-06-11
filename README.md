# Nobel Software

The data collected by this script is available here: https://kth-my.sharepoint.com/:u:/g/personal/tdurieux_ug_kth_se/EWo2MQyGPd5Pjr19VayMTncBjEfq7Eo2zY8iPRY5h912zA?e=bkaH2G


## Execution

### Dashboard

```
npm run start
```
### Match Nobel to Microsoft Academic

```
npm run process
```

Output: `data/nobels.json`

### Download Publication list

```
npm run papers
```

Output: `data/papers3/<nobel>.json`

### Download PDF of the publications

```
npm run pdf
```

Output: `data/papers3/<nobel>/<pub_id>.pdf`

### Extract links from PDF

```
npm run urls
```

Output: `links.csv`

### Extract keywords from PDF

```
npm run lang
```
Output: `lang.csv`

## Note 

List of nobel prices: http://api.nobelprize.org/v1/laureate.json

List of paper: https://api.labs.cognitive.microsoft.com/academic/v1.0/evaluate?expr=Composite(AA.AuN=='thomas durieux')&model=latest&count=1000&offset=0&attributes=DOI,DN,Ti,Y,J.JN,CC,AA.AuN,AA.AuId,S
Doc: https://docs.microsoft.com/en-us/academic-services/project-academic-knowledge/reference-paper-entity-attributes

https://academic.microsoft.com/author/2153275509/publication/search?q=Alex%20S.%20Willoughby&qe=Composite(AA.AuId%253D2153275509)&f=&orderBy=0&paperId=2138903426