'use client'

import { useState, useCallback } from 'react'
import type { Node, Edge, Connection, NodeTypes, NodeChange, EdgeChange, XYPosition } from '@xyflow/react'
import { ReactFlow, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brain, Search } from 'lucide-react'
import { SearchNode } from '@/components/flow/search-node'
import { ReportNode } from '@/components/flow/report-node'
import { SelectionNode } from '@/components/flow/selection-node'
import { QuestionNode } from '@/components/flow/question-node'
import type { SearchResult, Report } from '@/types'

const nodeTypes: NodeTypes = {
  searchNode: SearchNode,
  reportNode: ReportNode,
  selectionNode: SelectionNode,
  questionNode: QuestionNode,
}

const DEFAULT_MODEL = 'google__gemini-flash'

interface ResearchNode extends Node {
  data: {
    query?: string
    loading?: boolean
    results?: SearchResult[]
    report?: Report
    searchTerms?: string[]
    question?: string
    parentId?: string
    childIds?: string[]
    onGenerateReport?: (selectedResults: SearchResult[]) => void
    onApprove?: (term?: string) => void
    onConsolidate?: () => void
    hasChildren?: boolean
    error?: string
  }
}

export default function FlowPage() {
  const [nodes, setNodes] = useState<ResearchNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  )

  const createNode = (
    type: string, 
    position: XYPosition, 
    data: ResearchNode['data'],
    parentId?: string
  ): ResearchNode => ({
    id: `${type}-${Date.now()}`,
    type,
    position: {
      x: Math.max(0, Math.round(position.x)),
      y: Math.max(0, Math.round(position.y))
    },
    data: { ...data, childIds: data.childIds || [] },
    parentId, // This makes it a child node in the sub-flow
    extent: 'parent', // Keeps the node within its parent boundaries
  })

  const createGroupNode = (position: XYPosition, query: string): ResearchNode => ({
    id: `group-${Date.now()}`,
    type: 'group',
    position,
    style: {
      width: 800,  // Reduced width to better contain nodes
      height: 1000,
      padding: 60,  // Increased padding
      backgroundColor: 'rgba(240, 240, 240, 0.5)',
      borderRadius: 8,
    },
    data: {
      query,
      childIds: [],
    },
  })

  const handleStartResearch = async (parentReportId?: string) => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      // Calculate position for the group
      const groupPosition = {
        x: parentReportId ? nodes.length * 800 : 0, // Adjusted spacing between groups
        y: 0
      }

      // Create a group node for this research chain
      const groupNode = createGroupNode(groupPosition, query)
      
      // Create search node within the group - centered horizontally
      const searchNode = createNode(
        'searchNode',
        { x: 100, y: 80 }, // Adjusted to account for padding
        { 
          query, 
          loading: true,
          childIds: []
        },
        groupNode.id
      )

      // Add both nodes
      setNodes(nds => [...nds, groupNode, searchNode])

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          timeFilter: 'all',
          platformModel: DEFAULT_MODEL 
        }),
      })

      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      console.log('Search response:', data)

      if (!data.webPages?.value?.length) {
        throw new Error('No search results found')
      }

      // Transform search results to match expected format
      const searchResults = data.webPages.value.map((result: any) => ({
        id: result.id || `result-${Date.now()}-${Math.random()}`,
        url: result.url,
        name: result.name || result.title,
        snippet: result.snippet,
        isCustomUrl: false
      }))

      console.log('Transformed search results:', searchResults)

      // Create selection node within the group - centered horizontally
      const selectionNode = createNode(
        'selectionNode',
        { x: 100, y: 200 }, // Adjusted to account for padding
        {
          results: searchResults,
          onGenerateReport: (selected) => {
            console.log('Generate report clicked with:', selected)
            handleGenerateReport(selected, searchNode.id, groupNode.id)
          },
          childIds: []
        },
        groupNode.id
      )

      // Update nodes and add edge
      setNodes(nds => {
        const updatedNodes = nds.map(node => 
          node.id === searchNode.id 
            ? { ...node, data: { ...node.data, loading: false } }
            : node
        )
        return [...updatedNodes, selectionNode]
      })

      setEdges(eds => [...eds, {
        id: `edge-${searchNode.id}-${selectionNode.id}`,
        source: searchNode.id,
        target: selectionNode.id,
        animated: true
      }])
    } catch (error) {
      console.error('Search error:', error)
      setNodes(nds => nds.map(node => 
        node.data.loading ? { ...node, data: { ...node.data, loading: false, error: error instanceof Error ? error.message : 'Search failed' } } : node
      ))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async (
    selectedResults: SearchResult[], 
    searchNodeId: string,
    groupId: string
  ) => {
    console.log('handleGenerateReport called with:', { selectedResults, searchNodeId, groupId })
    
    if (selectedResults.length === 0) {
      console.error('No results selected')
      return
    }

    // Create report and search terms nodes
    const reportNode = createNode(
      'reportNode',
      { x: 100, y: 400 },
      {
        loading: true,
        hasChildren: false
      },
      groupId
    )

    const searchTermsNode = createNode(
      'questionNode', // Keep the type as questionNode for now since we're reusing the component
      { x: 100, y: 600 },
      { 
        loading: true
      },
      groupId
    )

    // Add nodes first
    setNodes(nds => [...nds, reportNode, searchTermsNode])

    // Add edges to connect nodes
    setEdges(eds => [
      ...eds,
      {
        id: `edge-${searchNodeId}-${reportNode.id}`,
        source: searchNodeId,
        target: reportNode.id,
        animated: true
      },
      {
        id: `edge-${reportNode.id}-${searchTermsNode.id}`,
        source: reportNode.id,
        target: searchTermsNode.id,
        animated: true
      }
    ])

    try {
      // Fetch content for selected results
      const contentResults = await Promise.all(
        selectedResults.map(async (result) => {
          try {
            const response = await fetch('/api/fetch-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: result.url }),
            })
            if (!response.ok) throw new Error('Failed to fetch content')
            const { content } = await response.json()
            return { 
              url: result.url, 
              title: result.name, 
              content: content || result.snippet 
            }
          } catch (error) {
            console.error('Content fetch error:', error)
            return { 
              url: result.url, 
              title: result.name, 
              content: result.snippet 
            }
          }
        })
      )

      // Filter out any results without content
      const validResults = contentResults.filter(r => r.content?.trim())
      if (validResults.length === 0) {
        throw new Error('No valid content found in selected results')
      }

      // Generate report
      const reportResponse = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedResults: validResults,
          sources: selectedResults,
          prompt: 'Provide comprehensive analysis of the selected sources.',
          platformModel: DEFAULT_MODEL,
        }),
      })

      if (!reportResponse.ok) {
        throw new Error('Failed to generate report')
      }
      
      const report = await reportResponse.json()

      // Generate search terms
      const searchTermsResponse = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report,
          platformModel: DEFAULT_MODEL,
        }),
      })

      if (!searchTermsResponse.ok) {
        throw new Error('Failed to generate search terms')
      }
      
      const { searchTerms } = await searchTermsResponse.json()

      // Update nodes with generated content
      setNodes(nds => nds.map(node => {
        if (node.id === reportNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              report,
              loading: false
            }
          }
        }
        if (node.id === searchTermsNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              searchTerms,
              loading: false,
              onApprove: (term?: string) => {
                if (term) {
                  setQuery(term)
                  handleStartResearch()
                }
              }
            }
          }
        }
        return node
      }))

    } catch (error) {
      console.error('Report generation error:', error)
      // Update error state for both nodes
      setNodes(nds => nds.map(node => {
        if (node.id === reportNode.id || node.id === searchTermsNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              loading: false,
              error: error instanceof Error ? error.message : 'Generation failed'
            }
          }
        }
        return node
      }))
    }
  }

  const consolidateReports = async (reportId: string) => {
    const reportChain = getReportChain(reportId)
    if (!reportChain.length) return

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedResults: [],
          sources: [],
          prompt: `Create a comprehensive consolidated report that synthesizes the following research chain. Each report builds upon the previous findings:

${reportChain.map((item, index) => `
Report ${index + 1} Title: ${item.title}
Report ${index + 1} Summary: ${item.summary}
`).join('\n')}

Provide a cohesive analysis that shows how the research evolved and what key insights were discovered along the way.`,
          platformModel: DEFAULT_MODEL,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate consolidated report')
      const consolidated: Report = await response.json()

      const rootNode = nodes.find(n => n.id === reportId)
      if (!rootNode?.parentId) throw new Error('Root node not found or has no parent')

      const consolidatedNode = createNode(
        'reportNode',
        { x: 50, y: 800 },
        {
          report: consolidated,
          loading: false,
          childIds: [],
          hasChildren: false
        },
        rootNode.parentId
      )

      setNodes(nds => [...nds, consolidatedNode])
      setEdges(eds => [...eds, {
        id: `edge-${reportId}-${consolidatedNode.id}`,
        source: reportId,
        target: consolidatedNode.id,
        animated: true,
        type: 'consolidated'
      }])
    } catch (error) {
      console.error('Consolidation error:', error)
    }
  }

  const getReportChain = (reportId: string): Report[] => {
    const chain: Report[] = []
    let currentNode = nodes.find(n => n.id === reportId)
    
    while (currentNode?.data.report) {
      chain.push(currentNode.data.report)
      currentNode = nodes.find(n => n.id === currentNode?.data.parentId)
    }
    
    return chain.reverse()
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b">
        <div className="max-w-4xl mx-auto flex gap-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter research topic"
            className="flex-1"
          />
          <Button
            onClick={() => handleStartResearch()}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Brain className="h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Start Research
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}