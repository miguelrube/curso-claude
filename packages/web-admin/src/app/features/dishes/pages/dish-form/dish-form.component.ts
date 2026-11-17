import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: Omit<CreateDishDto, 'price'> & { price: number | null } = {
    name: '',
    description: null,
    price: null,
    category: 'principal',
    available: true,
    ingredients: []
  }

  fieldErrors = signal<{ name?: string; price?: string }>({})
  liveMessage = signal('')
  private submitted = false

  readonly errorList = computed(() => {
    const e = this.fieldErrors()
    const list: { field: string; message: string }[] = []
    if (e.name) list.push({ field: 'dish-name', message: e.name })
    if (e.price) list.push({ field: 'dish-price', message: e.price })
    return list
  })

  newIngredientId = ''
  newIngredientQty = 1

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (this.restaurantId) {
      this.ingredientStore.loadByRestaurant(this.restaurantId)
    }

    if (id && this.restaurantId) {
      this.isEditing = true
      this.dishId = id
      this.loadDish()
    }
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  addIngredient(): void {
    if (!this.newIngredientId || this.newIngredientQty <= 0) return
    const exists = this.form.ingredients.find(i => i.ingredientId === this.newIngredientId)
    if (exists) return

    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty }
    ]
    this.liveMessage.set(`${this.getIngredientName(this.newIngredientId)} añadido.`)
    this.newIngredientId = ''
    this.newIngredientQty = 1
  }

  removeIngredient(ingredientId: string): void {
    this.liveMessage.set(`${this.getIngredientName(ingredientId)} quitado.`)
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  private validate(): boolean {
    const errors: { name?: string; price?: string } = {}
    if (!this.form.name || this.form.name.trim() === '') {
      errors.name = 'El nombre del plato es obligatorio.'
    }
    if (this.form.price === null || this.form.price === undefined || !(this.form.price > 0)) {
      errors.price = 'El precio es obligatorio y debe ser mayor que 0.'
    }
    this.fieldErrors.set(errors)
    return Object.keys(errors).length === 0
  }

  /** Tras un primer intento de envío, los errores se actualizan mientras se escribe. */
  revalidate(): void {
    if (this.submitted) this.validate()
  }

  focusField(event: Event, fieldId: string): void {
    event.preventDefault()
    document.getElementById(fieldId)?.focus()
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.submitted = true
    if (!this.validate()) {
      // Mueve el foco al primer campo con error (WCAG 3.3.1 / 3.3.3)
      document.getElementById(this.errorList()[0].field)?.focus()
      return
    }
    this.loading.set(true)
    try {
      const dto = this.form as CreateDishDto
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
