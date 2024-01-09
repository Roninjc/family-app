export function* dfs(initialNode: any) {
  const visitedNodes = new Map()
  const stack = []

  stack.push(initialNode)

  while (stack.length > 0) {
    const node = stack.pop()
    if (node && !visitedNodes.has(node)) {
      yield node
      visitedNodes.set(node, true)
      node.getAdjacents().forEach((adj: any) => stack.push(adj))
    }
  }
}

// export function* dfs(first: any) {
//   const visited = new Map()
//   const visitList: any[] = []

//   visitList.push(first)

//   while (visitList.length > 0) {
//     const node = visitList.pop()
//     if (node && !visited.has(node)) {
//       yield node
//       visited.set(node, true)
//       node.getAdjacents().forEach((adj: any) => visitList.push(adj))
//     }
//   }
// }

// export function* dfsWithDepth(node: any, depth: number = 0) {
//   yield { node, depth } // Emitir el nodo y su profundidad actual

//   const children = node.getChildren() // Obtener los nodos hijos (ajusta esta parte según tu estructura de datos)
//   for (const child of children) {
//     yield* dfsWithDepth(child, depth + 1) // Llamar recursivamente a dfsWithDepth para los nodos hijos con profundidad aumentada
//   }
// }

// export function findDeepestNode(rootNode: any): any {
//   let maxDepth = -1
//   let deepestNode = null

//   for (const { node, depth } of dfsWithDepth(rootNode)) {
//     if (depth > maxDepth) {
//       maxDepth = depth
//       deepestNode = node
//     }
//   }

//   return deepestNode
// }
