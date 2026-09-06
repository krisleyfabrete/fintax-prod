import { useState } from 'react';
import { useCategories, Category } from '@/hooks/useCategories';
import { useSubcategories, Subcategory } from '@/hooks/useSubcategories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, ChevronDown, ChevronRight, Loader2, Plus, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CategoryFormData = {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
};

const defaultFormData: CategoryFormData = {
  name: '',
  type: 'expense',
  color: '#8B5CF6',
  icon: 'tag',
};

export function CategoryManager() {
  const { categories, createCategory, updateCategory, deleteCategory, isCreatingCategory, isUpdatingCategory, isDeletingCategory } = useCategories();
  const { subcategories, getSubcategoriesByCategory, deleteSubcategory, isDeleting } = useSubcategories();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'subcategory'; id: string; name: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleDeleteClick = (type: 'category' | 'subcategory', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === 'category') {
        await deleteCategory(itemToDelete.id);
      } else {
        await deleteSubcategory(itemToDelete.id);
      }
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openCreateForm = (type: 'income' | 'expense') => {
    setEditingCategory(null);
    setFormData({ ...defaultFormData, type });
    setFormOpen(true);
  };

  const openEditForm = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type as 'income' | 'expense',
      color: category.color || '#8B5CF6',
      icon: category.icon || 'tag',
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...formData });
      } else {
        await createCategory(formData);
      }
      setFormOpen(false);
      setEditingCategory(null);
      setFormData(defaultFormData);
    } catch {
      // error handled in hook
    }
  };

  const renderCategoryItem = (category: Category) => {
    const categorySubcategories = getSubcategoriesByCategory(category.id);
    const isExpanded = expandedCategories.has(category.id);
    const canEdit = !category.is_default;
    const canDelete = !category.is_default;

    return (
      <div key={category.id} className="border rounded-lg overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
          <div className="flex items-center justify-between p-3 bg-muted/30">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity">
                {categorySubcategories.length > 0 ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium">{category.name}</span>
                {category.is_default && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Padrão
                  </span>
                )}
                {categorySubcategories.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({categorySubcategories.length} subcategorias)
                  </span>
                )}
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => openEditForm(category)}
                  disabled={isUpdatingCategory}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteClick('category', category.id, category.name)}
                  disabled={isDeletingCategory}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {categorySubcategories.length > 0 && (
            <CollapsibleContent>
              <div className="border-t bg-background">
                {categorySubcategories.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 pl-12 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className="text-sm">{sub.name}</span>
                      {sub.is_default && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Padrão
                        </span>
                      )}
                    </div>
                    {!sub.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick('subcategory', sub.id, sub.name)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  };

  return (
    <>
      <Card className="shadow-card border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Categorias</CardTitle>
              <CardDescription>
                Crie, edite e exclua categorias e subcategorias personalizadas.
                Categorias padrão não podem ser excluídas.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openCreateForm('expense')}>
                <Plus className="h-4 w-4 mr-2" />
                Nova despesa
              </Button>
              <Button size="sm" onClick={() => openCreateForm('income')}>
                <Plus className="h-4 w-4 mr-2" />
                Nova receita
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expense" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Despesas</TabsTrigger>
              <TabsTrigger value="income">Receitas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expense" className="space-y-2">
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma categoria de despesa encontrada.
                </p>
              ) : (
                expenseCategories.map(renderCategoryItem)
              )}
            </TabsContent>
            
            <TabsContent value="income" className="space-y-2">
              {incomeCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma categoria de receita encontrada.
                </p>
              ) : (
                incomeCategories.map(renderCategoryItem)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Alimentação"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                disabled={!!editingCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Ex: tag"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingCategory || isUpdatingCategory}>
                {(isCreatingCategory || isUpdatingCategory) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingCategory ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {itemToDelete?.type === 'category' ? 'a categoria' : 'a subcategoria'}{' '}
              <strong>{itemToDelete?.name}</strong>?
              {itemToDelete?.type === 'category' && (
                <span className="block mt-2 text-destructive">
                  Atenção: Todas as subcategorias desta categoria também serão excluídas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingCategory || isDeleting}
            >
              {(isDeletingCategory || isDeleting) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
