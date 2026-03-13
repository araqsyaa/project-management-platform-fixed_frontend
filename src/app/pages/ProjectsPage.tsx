import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../i18n/translations';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import { useProjects, useTeams } from '../api/useApi';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { teams, loading: teamsLoading } = useTeams();

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = filterTeam === 'all' || project.teamId === filterTeam;
    return matchesSearch && matchesTeam;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#6246EA';
      case 'completed': return '#2CB67D';
      case 'on-hold': return '#E45858';
      default: return '#2B2C34';
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(team => String(team.id) === teamId)?.name || 'Unknown Team';
  };

  if (projectsLoading) return <div className="p-8">Loading...</div>;
  if (projectsError) return <div className="p-8 text-red-500">Error: {projectsError}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{t.projects}</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t.createProject}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-foreground/20"
          />
        </div>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-48 border-foreground/20">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t.filterByTeam} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card 
            key={project.id} 
            className="border-foreground/10 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg">{project.title}</h3>
                  <Badge 
                    style={{ 
                      backgroundColor: getStatusColor(project.status) + '20',
                      color: getStatusColor(project.status)
                    }}
                  >
                    {project.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">{t.assignedTeam}</span>
                    <span className="font-medium">{getTeamName(project.teamId)}</span>
                  </div>
                  {project.client && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/60">Client</span>
                      <span className="font-medium">{project.client}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">{t.deadline}</span>
                    <span className="font-medium">{project.deadline}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground/60">{t.progress}</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${project.progress}%`,
                        backgroundColor: '#6246EA'
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-foreground/60">{t.noData}</p>
        </div>
      )}
    </div>
  );
}