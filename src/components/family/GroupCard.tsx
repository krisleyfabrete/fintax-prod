import { useState } from 'react';
import { Users, Copy, RefreshCw, Settings, LogOut, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FamilyGroup } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';

interface GroupCardProps {
  group: FamilyGroup;
  onSelect: (group: FamilyGroup) => void;
  onLeave: (groupId: string) => void;
  onDelete: (groupId: string) => void;
  onRegenerateCode: (groupId: string) => void;
}

export function GroupCard({
  group,
  onSelect,
  onLeave,
  onDelete,
  onRegenerateCode,
}: GroupCardProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const isOwner = group.owner_id === user?.id;

  const copyInviteCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(group)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{group.name}</CardTitle>
            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isOwner ? 'default' : 'secondary'}>
            {isOwner ? 'Admin' : 'Membro'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={copyInviteCode}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copiado!' : 'Copiar código'}
              </DropdownMenuItem>
              
              {isOwner && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerateCode(group.id);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar código
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {isOwner ? (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(group.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir grupo
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLeave(group.id);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair do grupo
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono bg-muted px-2 py-1 rounded">
            {group.invite_code}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={copyInviteCode}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
