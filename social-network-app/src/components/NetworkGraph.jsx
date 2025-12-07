import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Users, Share2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function NetworkGraph({ userId, onUserClick, className = '' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { showToast } = useUiStore();
  const [networkData, setNetworkData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadNetworkGraph();
  }, [userId]);

  useEffect(() => {
    if (networkData && canvasRef.current) {
      drawNetworkGraph();
    }
  }, [networkData, zoom, pan, selectedNode]);

  const loadNetworkGraph = async () => {
    try {
      setIsLoading(true);
      const response = await api.getNetworkGraph(userId);
      setNetworkData(response.network);
    } catch (error) {
      showToast('Failed to load network graph', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const drawNetworkGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || !networkData) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const centerX = rect.width / 2 / zoom - pan.x / zoom;
    const centerY = rect.height / 2 / zoom - pan.y / zoom;

    // Draw connections
    networkData.connections.forEach(connection => {
      const fromNode = networkData.nodes.find(n => n.id === connection.from);
      const toNode = networkData.nodes.find(n => n.id === connection.to);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x + centerX, fromNode.y + centerY);
        ctx.lineTo(toNode.x + centerX, toNode.y + centerY);
        ctx.strokeStyle = connection.strength > 0.7 ? '#10b981' : 
                          connection.strength > 0.4 ? '#f59e0b' : '#6b7280';
        ctx.lineWidth = connection.strength * 3;
        ctx.stroke();
      }
    });

    // Draw nodes
    networkData.nodes.forEach(node => {
      const x = node.x + centerX;
      const y = node.y + centerY;
      const radius = node.type === 'user' ? 20 : 15;
      
      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.type === 'user' ? '#3b82f6' : '#8b5cf6';
      if (selectedNode?.id === node.id) {
        ctx.fillStyle = '#ef4444';
      }
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Node label
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name || node.username, x, y + radius + 15);
    });

    ctx.restore();
  };

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !networkData) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const centerX = rect.width / 2 / zoom;
    const centerY = rect.height / 2 / zoom;
    
    // Find clicked node
    const clickedNode = networkData.nodes.find(node => {
      const nodeX = node.x + centerX;
      const nodeY = node.y + centerY;
      const radius = node.type === 'user' ? 20 : 15;
      
      const distance = Math.sqrt(Math.pow(x - nodeX, 2) + Math.pow(y - nodeY, 2));
      return distance <= radius;
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode);
      if (onUserClick && clickedNode.type === 'user') {
        onUserClick(clickedNode);
      }
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Network Graph
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetView}
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden"
          style={{ height: '400px' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        
        {selectedNode && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{selectedNode.name || selectedNode.username}</h4>
                <p className="text-sm text-gray-600">
                  {selectedNode.type === 'user' ? 'User' : 'Group'}
                </p>
                {selectedNode.connections && (
                  <p className="text-sm text-gray-500">
                    {selectedNode.connections} connections
                  </p>
                )}
              </div>
              <Badge variant={selectedNode.type === 'user' ? 'default' : 'secondary'}>
                {selectedNode.type}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}